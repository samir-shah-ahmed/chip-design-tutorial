module debounce #(parameter STABLE = 3) (
  input clk,
  input rst_n,
  input btn_n,
  output reg pressed
);
  reg s0, s1;
  reg [7:0] count;
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      s0 <= 1'b1;
      s1 <= 1'b1;
      count <= 0;
      pressed <= 1'b0;
    end else begin
      s0 <= btn_n;
      s1 <= s0;
      if (s1 == 1'b0) begin
        if (count >= STABLE)
          pressed <= 1'b1;
        else
          count <= count + 1'b1;
      end else begin
        count <= 0;
        pressed <= 1'b0;
      end
    end
  end
endmodule
