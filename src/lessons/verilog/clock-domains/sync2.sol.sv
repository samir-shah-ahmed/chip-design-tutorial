module sync2(
  input clk,
  input rst,
  input async_in,
  output reg sync_out
);
  reg meta;
  always @(posedge clk) begin
    if (rst) begin
      meta <= 1'b0;
      sync_out <= 1'b0;
    end else begin
      meta <= async_in;
      sync_out <= meta;
    end
  end
endmodule
