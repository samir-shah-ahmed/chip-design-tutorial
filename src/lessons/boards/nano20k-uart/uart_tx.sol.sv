module uart_tx #(parameter BIT_TICKS = 4) (
  input clk,
  input rst_n,
  input send,
  input [7:0] data,
  output reg tx
);
  reg [3:0] state;
  reg [15:0] tick;
  reg [7:0] shifter;
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      state <= 0;
      tick <= 0;
      tx <= 1'b1;
      shifter <= 0;
    end else if (state == 0) begin
      tx <= 1'b1;
      tick <= 0;
      if (send) begin
        shifter <= data;
        state <= 4'd1;
      end
    end else if (tick == BIT_TICKS - 1) begin
      tick <= 0;
      if (state == 4'd1) begin
        tx <= 1'b0;
        state <= 4'd2;
      end else if (state >= 4'd2 && state <= 4'd9) begin
        tx <= shifter[0];
        shifter <= {1'b0, shifter[7:1]};
        state <= state + 4'd1;
      end else begin
        tx <= 1'b1;
        state <= 0;
      end
    end else begin
      tick <= tick + 16'd1;
    end
  end
endmodule
