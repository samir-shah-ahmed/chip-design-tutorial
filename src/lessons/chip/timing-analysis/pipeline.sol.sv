module pipeline(
  input        clk, reset,
  input  [7:0] data_in,
  output reg [7:0] data_out
);
  reg [7:0] stage1, stage2, stage3;

  always @(posedge clk) begin
    if (reset) begin
      stage1 <= 0; stage2 <= 0; stage3 <= 0; data_out <= 0;
    end else begin
      stage1   <= data_in + 8'd1;
      stage2   <= stage1 * stage1;
      stage3   <= stage2 - 8'd3;
      data_out <= stage3;
    end
  end
endmodule
